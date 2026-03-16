import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import UrlCard from "../components/UrlCard";
import { useAuth } from "../context/AuthContext";
import { useUrls } from "../context/UrlContext";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { urls, loading, fetchMyUrls } = useUrls();

  useEffect(() => {
    if (user) {
      fetchMyUrls();
    }
  }, [fetchMyUrls, user]);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-600">Manage all of your shortened links.</p>

      {loading ? <p className="mt-4 text-slate-600">Loading...</p> : null}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {urls.map((item) => (
          <UrlCard key={item._id} item={item} />
        ))}
      </div>
    </main>
  );
};

export default Dashboard;

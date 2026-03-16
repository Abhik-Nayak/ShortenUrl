import { useEffect } from "react";
import UrlForm from "../components/UrlForm";
import UrlCard from "../components/UrlCard";
import { useAuth } from "../context/AuthContext";
import { useUrls } from "../context/UrlContext";

const Home = () => {
  const { user } = useAuth();
  const { urls, fetchMyUrls, loading } = useUrls();

  useEffect(() => {
    fetchMyUrls();
  }, [fetchMyUrls]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Shorten, track, and share links</h1>
      <p className="mt-2 text-slate-600">
        {user ? `Welcome ${user.name}` : "Create links as guest or login to manage them across devices."}
      </p>

      <div className="mt-6">
        <UrlForm isPro={Boolean(user?.isPro)} />
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900">Recent URLs</h2>
        {loading ? <p className="mt-3 text-slate-600">Loading...</p> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {urls.map((item) => (
            <UrlCard key={item._id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;

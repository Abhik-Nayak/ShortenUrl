import { Icon } from "@iconify/react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="mx-auto flex max-w-5xl items-center justify-center px-4 py-20">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Login</h1>
        <p className="mt-2 text-slate-600">Continue with your Google account.</p>

        <button
          type="button"
          onClick={login}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-700"
        >
          <Icon icon="mdi:google" />
          Continue with Google
        </button>
      </section>
    </main>
  );
};

export default Login;

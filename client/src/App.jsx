import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;

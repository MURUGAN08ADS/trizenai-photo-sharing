import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPhotos from "./pages/AdminPhotos";
import Gallery from "./pages/Gallery";
import TeamDashboard from "./pages/TeamDashboard";
import TeamEvent from "./pages/TeamEvent";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/team" element={<TeamDashboard />} />

        <Route
          path="/admin/events/:eventId/photos"
          element={<AdminPhotos />}
        />

        <Route
          path="/team/events/:eventId"
          element={<TeamEvent />}
        />

        <Route
          path="/gallery/:token"
          element={<Gallery />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
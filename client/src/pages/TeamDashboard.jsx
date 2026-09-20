import { useEffect, useState } from "react";
import api from "../services/api";

function TeamDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchEvents = async () => {
    try {
      const response = await api.get("/events/my-events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setEvents(response.data.events || []);
    } catch (error) {
      console.error("Failed to fetch assigned events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="flex items-center justify-between bg-black px-8 py-4 text-white">
        <h1 className="text-xl font-bold">TrizenAI</h1>

        <button
          onClick={logout}
          className="rounded-lg bg-white px-4 py-2 text-sm text-black"
        >
          Logout
        </button>
      </nav>

      <main className="p-8">
        <h2 className="mb-2 text-3xl font-bold">
          Team Member Dashboard
        </h2>

        <p className="mb-8 text-gray-500">
          View your assigned events and upload photos.
        </p>

        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-bold">
            My Events
          </h3>

          {loading ? (
            <p className="text-gray-500">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-gray-500">
              No events assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <h4 className="font-semibold">
                      {event.name}
                    </h4>

                    <p className="text-sm text-gray-500">
                      {event.description || "No description"}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      (window.location.href = `/team/events/${event.id}`)
                    }
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white"
                  >
                    Open Event
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TeamDashboard;
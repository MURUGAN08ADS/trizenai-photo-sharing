import { useEffect, useState } from "react";
import api from "../services/api";

function AdminDashboard() {
  const [events, setEvents] = useState([]);
const [loading, setLoading] = useState(true);

const [eventName, setEventName] = useState("");
const [eventDescription, setEventDescription] = useState("");
const [creating, setCreating] = useState(false);

  const token = localStorage.getItem("token");

  const fetchEvents = async () => {
    try {
      const response = await api.get("/events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setEvents(response.data.events || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e) => {
  e.preventDefault();

  if (!eventName.trim()) {
    alert("Event name is required");
    return;
  }

  try {
    setCreating(true);

    await api.post(
      "/events",
      {
        name: eventName.trim(),
        description: eventDescription.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setEventName("");
    setEventDescription("");

    await fetchEvents();

    alert("Event created successfully");
  } catch (error) {
    console.error("Failed to create event:", error);
    alert(
      error.response?.data?.message || "Failed to create event"
    );
  } finally {
    setCreating(false);
  }
};

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-black px-8 py-4 text-white">
        <h1 className="text-xl font-bold">TrizenAI</h1>

        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = "/";
          }}
          className="rounded-lg bg-white px-4 py-2 text-sm text-black"
        >
          Logout
        </button>
      </nav>

      {/* Dashboard */}
      <main className="p-8">
        <h2 className="mb-2 text-3xl font-bold">
          Admin Dashboard
        </h2>

        <p className="mb-8 text-gray-500">
          Manage events, photographers and galleries.
        </p>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
        {/* Create Event */}
<div className="mb-8 rounded-xl bg-white p-6 shadow">
  <h3 className="mb-4 text-xl font-bold">
    Create New Event
  </h3>

  <form onSubmit={createEvent} className="space-y-4">
    <input
      type="text"
      placeholder="Event name"
      value={eventName}
      onChange={(e) => setEventName(e.target.value)}
      className="w-full rounded-lg border p-3"
    />

    <textarea
      placeholder="Event description"
      value={eventDescription}
      onChange={(e) => setEventDescription(e.target.value)}
      className="w-full rounded-lg border p-3"
      rows="3"
    />

    <button
      type="submit"
      disabled={creating}
      className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
    >
      {creating ? "Creating..." : "Create Event"}
    </button>
  </form>
</div>
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">Total Events</p>
            <p className="mt-2 text-3xl font-bold">
              {events.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">Photos</p>
            <p className="mt-2 text-3xl font-bold">—</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">Galleries</p>
            <p className="mt-2 text-3xl font-bold">—</p>
          </div>
        </div>

        {/* Events */}
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-bold">
            Events
          </h3>

          {loading ? (
            <p className="text-gray-500">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-gray-500">
              No events created yet.
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
  onClick={() => {
    window.location.href = `/admin/events/${event.id}/photos`;
  }}
  className="rounded-lg bg-black px-4 py-2 text-sm text-white"
>
  View Photos
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

export default AdminDashboard;
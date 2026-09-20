import { useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function Gallery() {
  const { token } = useParams();

  const [pin, setPin] = useState("");
  const [photos, setPhotos] = useState([]);
  const [event, setEvent] = useState(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyPin = async (e) => {
    e.preventDefault();

    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must contain 4 to 6 digits");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post(`/photos/${token}/verify`, {
        pin,
      });

      setPhotos(response.data.photos || []);
      setEvent(response.data.event || null);
      setVerified(true);
    } catch (error) {
      console.error("GALLERY VERIFY ERROR:", error);

      setError(
        error.response?.data?.message ||
          "Invalid PIN or gallery unavailable"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-black px-8 py-4 text-white">
          <h1 className="text-xl font-bold">TrizenAI</h1>
        </nav>

        <main className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
            <h2 className="text-3xl font-bold">
              Private Gallery
            </h2>

            <p className="mt-2 text-gray-500">
              Enter the PIN provided by the event team.
            </p>

            <form onSubmit={verifyPin} className="mt-6">
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                placeholder="Enter Gallery PIN"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, ""))
                }
                className="w-full rounded-lg border px-4 py-3"
              />

              {error && (
                <p className="mt-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-lg bg-black px-5 py-3 text-white disabled:bg-gray-400"
              >
                {loading ? "Verifying..." : "View Gallery"}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-black px-8 py-4 text-white">
        <h1 className="text-xl font-bold">TrizenAI</h1>
      </nav>

      <main className="p-8">
        <h2 className="text-3xl font-bold">
          {event?.name || "Photo Gallery"}
        </h2>

        <p className="mt-2 text-gray-500">
          {photos.length} photo(s)
        </p>

        {photos.length === 0 ? (
          <div className="mt-8 rounded-xl bg-white p-8 text-gray-500 shadow">
            No photos available in this gallery.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-xl bg-white shadow"
              >
                <img
                  src={photo.storageUrl}
                  alt={photo.filename}
                  className="h-64 w-full object-cover"
                />

                <div className="p-4">
                  <p className="truncate font-semibold">
                    {photo.filename}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Gallery;
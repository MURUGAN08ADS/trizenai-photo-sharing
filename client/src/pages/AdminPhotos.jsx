import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function AdminPhotos() {
  const { eventId } = useParams();

  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState([]);
  const [pin, setPin] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [gallery, setGallery] = useState(null);

  const token = localStorage.getItem("token");

  // Fetch event photos
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await api.get(`/photos/event/${eventId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setPhotos(response.data.photos || []);
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      }
    };

    fetchPhotos();
  }, [eventId, token]);

  // Select / unselect photo
  const togglePhoto = (photoId) => {
    setSelected((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId]
    );
  };

  // Publish gallery
  const publishGallery = async () => {
    if (selected.length === 0) {
      alert("Select at least one photo");
      return;
    }

    if (!/^\d{4,6}$/.test(pin)) {
      alert("PIN must contain 4 to 6 digits");
      return;
    }

    try {
      setPublishing(true);

      const response = await api.post(
        "/photos/publish",
        {
          eventId: Number(eventId),
          photoIds: selected,
          pin,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setGallery(response.data.gallery);

      alert("Gallery published successfully!");
    } catch (error) {
      console.error("PUBLISH ERROR:", error);

      alert(
        error.response?.data?.message ||
          "Failed to publish gallery"
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-black px-8 py-4 text-white">
        <h1 className="text-xl font-bold">TrizenAI</h1>

        <button
          onClick={() => (window.location.href = "/admin")}
          className="rounded-lg bg-white px-4 py-2 text-sm text-black"
        >
          Back
        </button>
      </nav>

      {/* Main Content */}
      <main className="p-8">
        <h2 className="text-3xl font-bold">Photo Review</h2>

        <p className="mt-2 text-gray-500">
          Select photos for the customer gallery.
        </p>

        <p className="mt-4 font-semibold">
          {selected.length} photo(s) selected
        </p>

        {/* Gallery Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength="6"
            placeholder="Gallery PIN"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, ""))
            }
            className="rounded-lg border px-4 py-2"
          />

          <button
            onClick={publishGallery}
            disabled={publishing || selected.length === 0}
            className="rounded-lg bg-black px-5 py-2 text-white disabled:bg-gray-400"
          >
            {publishing ? "Publishing..." : "Publish Gallery"}
          </button>
        </div>

        {/* Published Gallery Information */}
        {gallery && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow">
            <h3 className="text-xl font-bold">
              Gallery Published
            </h3>

            <p className="mt-2">
              <strong>Gallery URL:</strong>
            </p>

            <p className="break-all text-blue-600">
              {window.location.origin}/gallery/{gallery.token}
            </p>

            <p className="mt-2">
              <strong>PIN:</strong> {pin}
            </p>
          </div>
        )}

        {/* Photos */}
        {photos.length === 0 ? (
          <div className="mt-8 rounded-xl bg-white p-8 text-gray-500 shadow">
            No photos uploaded for this event.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => {
              const isSelected = selected.includes(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={() => togglePhoto(photo.id)}
                  className={`cursor-pointer overflow-hidden rounded-xl bg-white shadow ${
                    isSelected ? "ring-4 ring-black" : ""
                  }`}
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

                    <p className="mt-1 text-sm text-gray-500">
                      Uploaded by{" "}
                      {photo.uploader?.name || "Unknown"}
                    </p>

                    <div className="mt-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          isSelected
                            ? "bg-black text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPhotos;
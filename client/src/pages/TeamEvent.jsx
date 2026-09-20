import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function TeamEvent() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photosError, setPhotosError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get("/events/my-events", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const foundEvent = response.data.events.find(
          (item) => item.id === Number(eventId)
        );

        setEvent(foundEvent || null);

        if (!foundEvent) {
          setPhotosLoading(false);
          return;
        }

        const photosResponse = await api.get(
          `/photos/my-events/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPhotos(photosResponse.data.photos || []);
      } catch (error) {
        console.error("Failed to load event:", error);
        setPhotosError(
          error.response?.data?.message || "Failed to load your photos"
        );
      }
      finally {
        setPhotosLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, token]);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      alert("Please select at least one image");
      return;
    }

    const formData = new FormData();

    formData.append("eventId", eventId);

    files.forEach((file) => {
      formData.append("photos", file);
    });

    try {
      setUploading(true);

      await api.post("/photos/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const photosResponse = await api.get(
        `/photos/my-events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Photos uploaded successfully");
      setFiles([]);
      setPhotos(photosResponse.data.photos || []);
      setPhotosError("");
    } catch (error) {
      console.error("Upload failed:", error);

      alert(
        error.response?.data?.message || "Photo upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  if (!event) {
    return (
      <div className="p-8">
        <p>Event not found or you are not assigned to this event.</p>
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
          {event.name}
        </h2>

        <p className="mt-2 text-gray-500">
          {event.description || "No description"}
        </p>

        <section className="mt-8 rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-bold">My Photos</h3>

          {photosLoading ? (
            <p className="text-gray-500">Loading your photos...</p>
          ) : photosError ? (
            <p className="text-red-600">{photosError}</p>
          ) : photos.length === 0 ? (
            <p className="text-gray-500">You have not uploaded any photos yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <figure key={photo.id} className="overflow-hidden rounded-lg border">
                  <img
                    src={photo.storageUrl}
                    alt={photo.filename}
                    className="h-48 w-full object-cover"
                  />
                  <figcaption className="truncate p-3 text-sm text-gray-600">
                    {photo.filename}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 max-w-xl rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-bold">
            Upload Photos
          </h3>

          <form onSubmit={handleUpload}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="w-full rounded-lg border p-3"
            />

            {files.length > 0 && (
              <p className="mt-3 text-sm text-gray-500">
                {files.length} image(s) selected
              </p>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="mt-4 rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Photos"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default TeamEvent;
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "", company: "", role: "", domain: "TECHNICAL", startTime: "", endTime: ""
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
      fetchEvents(payload.userId);
    } catch(e) {
      router.push("/login");
    }
  }, [router]);

  const fetchEvents = (uid: string) => {
    const token = localStorage.getItem("token");
    fetch(`http://localhost:4000/api/calendar/${uid}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEvents(data);
      });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4000/api/calendar/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        setShowAdd(false);
        fetchEvents(userId);
      } else {
        alert("Failed to add event");
      }
    } catch (error) {
      console.error(error);
      alert("Network error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h1 className="text-3xl font-bold">Upcoming Interviews</h1>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold text-sm transition"
          >
            {showAdd ? "Cancel" : "+ Add Interview"}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 grid grid-cols-2 gap-4">
            <input type="text" placeholder="Title (e.g. Google Round 2)" required className="rounded bg-zinc-800 p-3 border border-zinc-700 outline-none" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
            <input type="text" placeholder="Company" className="rounded bg-zinc-800 p-3 border border-zinc-700 outline-none" value={newEvent.company} onChange={e => setNewEvent({...newEvent, company: e.target.value})} />
            <input type="text" placeholder="Role" className="rounded bg-zinc-800 p-3 border border-zinc-700 outline-none" value={newEvent.role} onChange={e => setNewEvent({...newEvent, role: e.target.value})} />
            <select className="rounded bg-zinc-800 p-3 border border-zinc-700 outline-none" value={newEvent.domain} onChange={e => setNewEvent({...newEvent, domain: e.target.value})}>
              <option value="TECHNICAL">Technical</option>
              <option value="CODING">Coding</option>
            </select>
            <input type="datetime-local" required className="rounded bg-zinc-800 p-3 border border-zinc-700 outline-none" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} />
            <input type="datetime-local" required className="rounded bg-zinc-800 p-3 border border-zinc-700 outline-none" value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} />
            <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold mt-2">Schedule</button>
          </form>
        )}

        <div className="flex flex-col gap-4">
          {events.length === 0 ? (
            <div className="text-zinc-500 py-8 text-center">No upcoming interviews scheduled.</div>
          ) : (
            events.map(event => (
              <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex justify-between items-center transition hover:border-zinc-700">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
                  <p className="text-zinc-400 text-sm mb-2">{event.company} • {event.role} • {event.domain}</p>
                  <div className="text-blue-400 text-sm font-semibold">
                    {new Date(event.startTime).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

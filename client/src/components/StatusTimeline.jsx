const steps = ["Submitted", "Under Review", "Investigation", "Resolved"];

export default function StatusTimeline({ status = "Open" }) {
  const statusIndexMap = {
    Open: 0,
    "Under Review": 1,
    Investigation: 2,
    Resolved: 3
  };
  const current = statusIndexMap[status] ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {steps.map((step, idx) => {
        const completed = idx < current;
        const active = idx === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                completed ? "bg-green-600 text-white" : active ? "bg-brand text-white" : "bg-gray-300 text-gray-700"
              }`}
            >
              {idx + 1}
            </span>
            <span className={`${active ? "text-brand font-semibold" : "text-gray-600"} text-sm`}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

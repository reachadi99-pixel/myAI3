"use client";

import { useState } from "react";
export function CollegeCompare({ onSend, defaults }: CollegeCompareProps) {
  const [collegeA, setCollegeA] = useState("");
  const [collegeB, setCollegeB] = useState("");
  const [selectedParams, setSelectedParams] = useState<string[]>([]);

  // When defaults change (after "compare X and Y"), prefill
  useEffect(() => {
    if (defaults?.collegeA) setCollegeA(defaults.collegeA);
    if (defaults?.collegeB) setCollegeB(defaults.collegeB);

    // sensible default parameters for first comparison
    if (defaults && selectedParams.length === 0) {
      setSelectedParams(["Median CTC", "Highest CTC", "Average CTC"]);
    }
  }, [defaults]);

const COLLEGES = [
  "IIM Ahmedabad",
  "IIM Bangalore",
  "IIM Calcutta",
  "IIM Lucknow",
  "IIM Kozhikode",
  "XLRI Jamshedpur",
  "SPJIMR Mumbai",
  "IIM Mumbai",
  "IIM Udaipur",
  "BITSoM",
];

const PARAMETERS = [
  "QS Ranking",
  "Median CTC",
  "Highest CTC",
  "Average CTC",
  "Batch Size",
  "Program Fee",
  "Major Recruiters",
  "Gender Ratio",
  "Average Work Experience"
];

type CollegeCompareProps = {
  onSend: (content: string) => void;
  defaults?: {
    collegeA?: string;
    collegeB?: string;
  };
};

export function CollegeCompare({ onSend }: CollegeCompareProps) {
  const [collegeA, setCollegeA] = useState("");
  const [collegeB, setCollegeB] = useState("");
  const [selectedParams, setSelectedParams] = useState<string[]>([]);

  const toggleParam = (param: string) => {
    setSelectedParams((prev) =>
      prev.includes(param)
        ? prev.filter((p) => p !== param)
        : [...prev, param]
    );
  };

  const handleCompare = () => {
    if (!collegeA || !collegeB || selectedParams.length === 0) return;

    const message = `Compare ${collegeA} and ${collegeB} on these parameters: ${selectedParams.join(
      ", "
    )}. Show the answer in a clear markdown table.`;

    onSend(message);
  };

  return (
    <div className="border rounded-lg p-3 mb-3 text-sm bg-gray-50">
      <div className="font-medium mb-2">Compare two B-schools</div>

      <div className="flex gap-2 mb-2">
        <select
          className="flex-1 border rounded px-2 py-1"
          value={collegeA}
          onChange={(e) => setCollegeA(e.target.value)}
        >
          <option value="">College 1</option>
          {COLLEGES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="flex-1 border rounded px-2 py-1"
          value={collegeB}
          onChange={(e) => setCollegeB(e.target.value)}
        >
          <option value="">College 2</option>
          {COLLEGES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-xs text-gray-600">Parameters</div>
        <div className="flex flex-wrap gap-2">
          {PARAMETERS.map((p) => (
            <label key={p} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={selectedParams.includes(p)}
                onChange={() => toggleParam(p)}
              />
              {p}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleCompare}
        className="mt-1 px-3 py-1 rounded bg-black text-white text-xs disabled:opacity-40"
        disabled={!collegeA || !collegeB || selectedParams.length === 0}
      >
        Compare
      </button>
    </div>
  );
}
